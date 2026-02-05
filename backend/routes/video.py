"""
Video generation routes using Sora 2.
"""
import logging
import os
import uuid
import base64
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video", tags=["Video Generation"])

# Will be set by main app
db = None

# Store for tracking video generation status
video_jobs = {}


class VideoGenerationRequest(BaseModel):
    user_id: str
    prompt: str
    model: str = "sora-2"  # sora-2 or sora-2-pro
    size: str = "1280x720"  # 1280x720, 1792x1024, 1024x1792, 1024x1024
    duration: int = 4  # 4, 8, or 12 seconds


class VideoGenerationResponse(BaseModel):
    job_id: str
    status: str
    message: str


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


async def generate_video_task(job_id: str, prompt: str, model: str, size: str, duration: int, user_id: str):
    """Background task to generate video with Sora 2."""
    try:
        from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration
        
        video_jobs[job_id]["status"] = "processing"
        logger.info(f"Starting video generation for job {job_id}")
        
        video_gen = OpenAIVideoGeneration(api_key=settings.EMERGENT_LLM_KEY)
        
        # Adjust max_wait_time based on duration and model
        max_wait = 600  # 10 minutes default
        if duration >= 8 or model == "sora-2-pro":
            max_wait = 900  # 15 minutes for longer/pro videos
        
        video_bytes = video_gen.text_to_video(
            prompt=prompt,
            model=model,
            size=size,
            duration=duration,
            max_wait_time=max_wait
        )
        
        if video_bytes:
            # Save video to file
            output_dir = settings.ROOT_DIR / "generated_videos"
            output_dir.mkdir(exist_ok=True)
            output_path = output_dir / f"{job_id}.mp4"
            
            video_gen.save_video(video_bytes, str(output_path))
            
            # Also encode as base64 for direct delivery
            video_b64 = base64.b64encode(video_bytes).decode('utf-8')
            
            video_jobs[job_id]["status"] = "completed"
            video_jobs[job_id]["video_path"] = str(output_path)
            video_jobs[job_id]["video_base64"] = video_b64
            
            # Store in database for persistence
            if db is not None:
                await db.generated_videos.insert_one({
                    "job_id": job_id,
                    "user_id": user_id,
                    "prompt": prompt,
                    "model": model,
                    "size": size,
                    "duration": duration,
                    "status": "completed",
                    "video_path": str(output_path)
                })
            
            logger.info(f"Video generation completed for job {job_id}")
        else:
            video_jobs[job_id]["status"] = "failed"
            video_jobs[job_id]["error"] = "Video generation returned no data"
            logger.error(f"Video generation failed for job {job_id}: No data returned")
            
    except Exception as e:
        video_jobs[job_id]["status"] = "failed"
        video_jobs[job_id]["error"] = str(e)
        logger.error(f"Video generation error for job {job_id}: {str(e)}")


@router.post("/generate", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    """
    Generate a video using Sora 2.
    
    This starts a background task and returns immediately with a job_id.
    Use GET /video/status/{job_id} to check progress.
    
    Parameters:
    - prompt: Text description of the video to generate
    - model: "sora-2" (default) or "sora-2-pro" (higher quality)
    - size: "1280x720" (default), "1792x1024", "1024x1792", or "1024x1024"
    - duration: 4 (default), 8, or 12 seconds
    """
    # Validate size
    valid_sizes = ["1280x720", "1792x1024", "1024x1792", "1024x1024"]
    if request.size not in valid_sizes:
        raise HTTPException(status_code=400, detail=f"Invalid size. Must be one of: {valid_sizes}")
    
    # Validate duration
    valid_durations = [4, 8, 12]
    if request.duration not in valid_durations:
        raise HTTPException(status_code=400, detail=f"Invalid duration. Must be one of: {valid_durations}")
    
    # Validate model
    valid_models = ["sora-2", "sora-2-pro"]
    if request.model not in valid_models:
        raise HTTPException(status_code=400, detail=f"Invalid model. Must be one of: {valid_models}")
    
    # Check API key
    if not settings.EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Video generation API key not configured")
    
    # Create job
    job_id = str(uuid.uuid4())
    video_jobs[job_id] = {
        "status": "queued",
        "user_id": request.user_id,
        "prompt": request.prompt,
        "model": request.model,
        "size": request.size,
        "duration": request.duration
    }
    
    # Start background task
    background_tasks.add_task(
        generate_video_task,
        job_id,
        request.prompt,
        request.model,
        request.size,
        request.duration,
        request.user_id
    )
    
    return VideoGenerationResponse(
        job_id=job_id,
        status="queued",
        message=f"Video generation started. Expected time: {2 + request.duration}-{5 + request.duration} minutes. Check status at /api/video/status/{job_id}"
    )


@router.get("/status/{job_id}")
async def get_video_status(job_id: str):
    """Get the status of a video generation job."""
    if job_id not in video_jobs:
        # Check database
        if db:
            db_job = await db.generated_videos.find_one({"job_id": job_id}, {"_id": 0})
            if db_job:
                return {
                    "job_id": job_id,
                    "status": db_job.get("status"),
                    "video_path": db_job.get("video_path")
                }
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = video_jobs[job_id]
    response = {
        "job_id": job_id,
        "status": job["status"],
        "prompt": job.get("prompt"),
        "model": job.get("model"),
        "size": job.get("size"),
        "duration": job.get("duration")
    }
    
    if job["status"] == "completed":
        response["video_path"] = job.get("video_path")
        # Include base64 video for direct download (optional - can be large)
        if job.get("video_base64"):
            response["video_url"] = f"data:video/mp4;base64,{job['video_base64']}"
    elif job["status"] == "failed":
        response["error"] = job.get("error")
    
    return response


@router.get("/user/{user_id}")
async def get_user_videos(user_id: str):
    """Get all videos generated by a user."""
    if not db:
        return {"videos": []}
    
    cursor = db.generated_videos.find({"user_id": user_id}, {"_id": 0})
    videos = await cursor.to_list(length=100)
    
    return {"videos": videos}


@router.post("/dance")
async def generate_dance_video(
    user_id: str,
    bestie_name: str,
    dance_style: str = "fun casual dance",
    background_tasks: BackgroundTasks = None
):
    """
    Generate a dance video with user's avatar and bestie.
    
    This is a convenience endpoint that creates an appropriate prompt
    for a dance video featuring two people.
    """
    prompt = f"""Two best friends dancing together in a stylish living room.
One is a young woman and the other is her fashionable gay best friend named {bestie_name}.
They are doing a {dance_style}, laughing and having fun together.
Bright, warm lighting. Modern interior. Happy, energetic mood.
Professional video quality, smooth movements."""
    
    request = VideoGenerationRequest(
        user_id=user_id,
        prompt=prompt,
        model="sora-2",
        size="1280x720",
        duration=4
    )
    
    return await generate_video(request, background_tasks)
