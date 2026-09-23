# OpenRouter API Model Catalog Specification

## 1. Catalog Endpoint
- **URL**: `https://openrouter.ai/api/v1/models`
- **Method**: `GET`
- **Headers**:
  ```http
  Authorization: Bearer <OPENROUTER_API_KEY>
  HTTP-Referer: <client-site-or-id>
  X-Title: <app-name>
  ```

## 2. Response Object Architecture
The response returns a root JSON object containing a `data` list:
```json
{
  "data": [
    {
      "id": "meta-llama/llama-3.3-70b-instruct:free",
      "name": "Meta: Llama 3.3 70B Instruct (free)",
      "description": "...",
      "context_length": 131072,
      "pricing": {
        "prompt": "0",
        "completion": "0",
        "image": "0",
        "request": "0"
      },
      "architecture": {
        "modality": "text->text",
        "input_modalities": ["text"],
        "output_modalities": ["text"],
        "instruct_type": "chatml",
        "tokenizer": "llama3"
      }
    }
  ]
}
```

## 3. Capability Extraction Rules
- **Pricing**: `float(pricing.get("prompt", 1)) == 0` or `:free` in `id` -> `Free`
- **Vision**: `"image" in architecture.get("input_modalities", [])` or `"image" in architecture.get("modality", "")` -> `Vision`
- **Audio**: `"audio" in architecture.get("input_modalities", [])` or `"audio" in description.lower()` -> `Audio`
- **Reasoning**: `"r1" in id.lower()` or `"reasoning" in id.lower()` or `"thinking" in description.lower()` -> `Reasoning`
- **Coding**: `"coder" in id.lower()` or `"code" in id.lower()` or `"devstral" in id.lower()` -> `Coding`
