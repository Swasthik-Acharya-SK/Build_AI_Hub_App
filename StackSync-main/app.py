from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

items = []
@app.get('/hello')
def hello():
    return send_file("./requirements.txt")
@app.get("/api/health")
def health_check():
    return jsonify({"status": "ok", "message": "Flask API is running"})

@app.get("/api/items")
def get_items():
    return jsonify(items)

@app.post("/api/items")
def create_item():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    
    if not name:
        return jsonify({"error": "name is required"}), 400
    
    new_id = len(items) + 1
    item = {"id": new_id, "name": name, "description": description}
    items.append(item)
    
    return jsonify({"message": "Item created", "id": new_id}), 201

@app.put("/api/items/<int:item_id>")
def update_item(item_id):
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    
    if not name:
        return jsonify({"error": "name is required"}), 400
    
    for item in items:
        if item["id"] == item_id:
            item["name"] = name
            item["description"] = description
            return jsonify({"message": "Item updated"})
    
    return jsonify({"error": "Item not found"}), 404

@app.patch("/api/items/<int:item_id>")
def patch_item(item_id):
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    
    if not name and not description:
        return jsonify({"error": "name or description is required"}), 400
    
    for item in items:
        if item["id"] == item_id:
            if name:
                item["name"] = name
            if description:
                item["description"] = description
            return jsonify({"message": "Item updated"})
    
    return jsonify({"error": "Item not found"}), 404

@app.delete("/api/items/<int:item_id>")
def delete_item(item_id):
    for i, item in enumerate(items):
        if item["id"] == item_id:
            items.pop(i)
            return jsonify({"message": "Item deleted"})
    
    return jsonify({"error": "Item not found"}), 404


if __name__ == "__main__":
    app.run(debug=True)
