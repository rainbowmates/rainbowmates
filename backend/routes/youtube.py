"""
YouTube routes for video search.
"""
import logging
import os
import aiohttp
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/youtube", tags=["YouTube"])

# YouTube API key from environment
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', '')


@router.get("/search")
async def youtube_search(query: str, max_results: int = 10):
    """
    Search YouTube for karaoke videos.
    Uses proxy or direct API depending on configuration.
    """
    try:
        # Use integration proxy if available
        integration_proxy_url = os.environ.get('INTEGRATION_PROXY_URL', '')
        
        if integration_proxy_url:
            # Use proxy endpoint
            proxy_url = f"{integration_proxy_url}/youtube/search"
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    proxy_url,
                    params={"query": query, "max_results": max_results},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    else:
                        error_text = await response.text()
                        logger.error(f"YouTube proxy error: {response.status} - {error_text}")
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"YouTube search failed: {error_text}"
                        )
        elif YOUTUBE_API_KEY:
            # Direct YouTube API call
            search_url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "key": YOUTUBE_API_KEY
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    search_url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Transform response to consistent format
                        videos = []
                        for item in data.get("items", []):
                            videos.append({
                                "id": item["id"]["videoId"],
                                "title": item["snippet"]["title"],
                                "thumbnail": item["snippet"]["thumbnails"]["default"]["url"],
                                "channel": item["snippet"]["channelTitle"]
                            })
                        return {"videos": videos}
                    else:
                        error_text = await response.text()
                        logger.error(f"YouTube API error: {response.status} - {error_text}")
                        raise HTTPException(
                            status_code=response.status,
                            detail="YouTube search failed"
                        )
        else:
            raise HTTPException(
                status_code=500,
                detail="YouTube search not configured"
            )
            
    except aiohttp.ClientError as e:
        logger.error(f"Network error in YouTube search: {str(e)}")
        raise HTTPException(status_code=503, detail="YouTube service unavailable")
    except Exception as e:
        logger.error(f"Error in YouTube search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
