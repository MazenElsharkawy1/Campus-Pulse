# ✅ ملف جديد: app/core/monitor_store.py
from typing import Dict, Optional
from datetime import datetime, timedelta

class MonitorStore:
    """
    Simple in-memory store for active student dashboards
    • For production: replace with Redis
    • For demo: this works perfectly
    """
    
    def __init__(self):
        # { user_email: { dashboard_data, last_seen } }
        self._active_students: Dict[str, dict] = {}
        self._timeout_seconds = 300  # Remove if no update for 5 minutes
    
    def update_student(self, email: str, dashboard_data: dict) -> None:
        """Called when student sends dashboard update"""
        self._active_students[email] = {
            "data": dashboard_data,
            "last_seen": datetime.now()
        }
    
    def get_active_users(self) -> list[str]:
        """Returns list of emails who updated in last 5 minutes"""
        now = datetime.now()
        active = []
        for email, info in list(self._active_students.items()):
            if (now - info["last_seen"]).total_seconds() < self._timeout_seconds:
                active.append(email)
            else:
                # Cleanup stale entries
                del self._active_students[email]
        return active
    
    def get_student_dashboard(self, email: str) -> Optional[dict]:
        """Returns dashboard data for specific student"""
        info = self._active_students.get(email)
        if info and (datetime.now() - info["last_seen"]).total_seconds() < self._timeout_seconds:
            return info["data"]
        return None
    
    def remove_student(self, email: str) -> None:
        """Manually remove a student (e.g., on logout)"""
        if email in self._active_students:
            del self._active_students[email]

# ✅ Global instance
monitor_store = MonitorStore()