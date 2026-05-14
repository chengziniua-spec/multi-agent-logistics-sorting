from typing import Dict


class Environment:
    def __init__(self):
        self.time = 0.0

    def process_package(self, package: Dict[str, str]) -> Dict[str, float]:
        weight = float(package.get("weight", 0.0))
        priority = int(package.get("priority", 3))
        duration = max(0.5, weight * 0.1) / priority
        self.time += duration
        return {"package_id": package.get("id"), "duration": duration, "success": True}
