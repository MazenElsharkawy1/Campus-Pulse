import hashlib

def hash_password(password: str) -> str:
    """تشفير الباسورد باستخدام SHA256 (للتبسيط)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """التحقق من الباسورد"""
    return hash_password(plain_password) == hashed_password