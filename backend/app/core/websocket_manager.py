# core/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.student_connections: Dict[str, WebSocket] = {}
        self.university_media_adviser_connections: List[WebSocket] = []

    async def connect_student(self, ws: WebSocket, user_id: str):
        await ws.accept()
        self.student_connections[user_id] = ws
        await self._broadcast({"event": "user_opened", "user_id": user_id})

    async def disconnect_student(self, user_id: str):
        self.student_connections.pop(user_id, None)
        await self._broadcast({"event": "user_closed", "user_id": user_id})

    async def connect_university_media_adviser(self, ws: WebSocket):
        await ws.accept()
        self.university_media_adviser_connections.append(ws)
        await ws.send_json({
            "event": "snapshot",
            "active_users": list(self.student_connections.keys())
        })

    async def disconnect_university_media_adviser(self, ws: WebSocket):
        if ws in self.university_media_adviser_connections:
            self.university_media_adviser_connections.remove(ws)

    async def _broadcast(self, message: dict):
        """يبعت رسالة لكل المديرين المتصلين وينظف الروابط المقطوعة"""
        disconnected = []
        for ws in self.university_media_adviser_connections:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)
        
        for ws in disconnected:
            self.university_media_adviser_connections.remove(ws)

    async def push_student_view(self, user_id: str, content: dict):
        """
        تبعت بيانات الداشبورد للمديرين فوراً.
        ✅ تم إزالة شرط وجود الطالب في student_connections عشان البث يعتمد على نجاح الـ API مش على الـ WS
        """
        await self._broadcast({
            "event": "user_update",
            "user_id": user_id,
            "data": content 
        })

university_media_adviser = ConnectionManager()