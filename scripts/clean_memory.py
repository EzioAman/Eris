import sqlite3
import json
import os

print("--- Cleaning memory/auth.db ---")
conn = sqlite3.connect("memory/auth.db")
cur = conn.cursor()

# Clear test/fake users, otps, sessions, audit_logs, workflow_runs
cur.execute("DELETE FROM users")
cur.execute("DELETE FROM otps")
cur.execute("DELETE FROM sessions")
cur.execute("DELETE FROM audit_logs")
cur.execute("DELETE FROM workflow_runs")
conn.commit()
conn.close()
print("Cleaned memory/auth.db tables.")

print("--- Cleaning memory JSON files ---")
# memory.json
memory_path = "memory/memory.json"
if os.path.exists(memory_path):
    with open(memory_path, "w", encoding="utf-8") as f:
        json.dump({
            "identity": "You are ERIS, an autonomous AI companion and assistant.",
            "history": []
        }, f, indent=2)
    print("Cleaned memory/memory.json")

# contact_messages.json
contact_path = "memory/contact_messages.json"
if os.path.exists(contact_path):
    with open(contact_path, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print("Cleaned memory/contact_messages.json")

# feedback.json
feedback_path = "memory/feedback.json"
if os.path.exists(feedback_path):
    with open(feedback_path, "w", encoding="utf-8") as f:
        json.dump({"feedback": []}, f, indent=2)
    print("Cleaned memory/feedback.json")

# user_habits.json
habits_path = "memory/user_habits.json"
if os.path.exists(habits_path):
    with open(habits_path, "w", encoding="utf-8") as f:
        json.dump({"decisions": []}, f, indent=2)
    print("Cleaned memory/user_habits.json")

print("All fake/demo emails and test rows removed from memory.")
