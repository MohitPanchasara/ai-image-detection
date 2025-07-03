import os, json, base64, tempfile
from eval_saved import run_inference

def handler(request, context):
    try:
        payload = json.loads(request.body)
        data_uri = payload.get("image", "")
        header, b64 = data_uri.split(",", 1)
    except Exception:
        return { "statusCode": 400, "body": json.dumps({"error":"no image"}) }

    # write to a tmp file
    tmp = os.path.join(tempfile.gettempdir(), "upload.png")
    with open(tmp, "wb") as f:
        f.write(base64.b64decode(b64))

    try:
        score = run_inference(tmp)   # your existing eval_saved.py function
        return {
            "statusCode": 200,
            "body": json.dumps({"score": score})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Inference failed: {str(e)}"})
        }
