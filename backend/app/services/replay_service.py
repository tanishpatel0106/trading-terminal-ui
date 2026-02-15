from fastapi import HTTPException


class ReplayService:
    async def load_lobster(self, session_id: str) -> None:
        raise HTTPException(status_code=501, detail="LOBSTER replay integration not enabled in this build")
