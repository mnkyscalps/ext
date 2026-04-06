"""
Axiom TX Info API

Install:  pip install -r requirements.txt
Run:      uvicorn api:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

# === CONFIG ===
RPC_URL = "https://api.mainnet-beta.solana.com"  # Replace with your RPC

app = FastAPI(title="Axiom TX Info")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


async def rpc(method: str, params: list):
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(RPC_URL, json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        })
        data = res.json()
        if "error" in data:
            raise HTTPException(400, data["error"])
        return data.get("result")


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/tx/{signature}")
async def get_tx_info(signature: str):
    tx = await rpc("getTransaction", [
        signature,
        {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0, "commitment": "confirmed"}
    ])

    if not tx:
        raise HTTPException(404, "Transaction not found")

    slot = tx["slot"]

    block = await rpc("getBlock", [
        slot,
        {"encoding": "jsonParsed", "transactionDetails": "signatures", "maxSupportedTransactionVersion": 0, "commitment": "confirmed", "rewards": False}
    ])

    tx_index = None
    total_txs = None

    if block and "signatures" in block:
        sigs = block["signatures"]
        if signature in sigs:
            tx_index = sigs.index(signature)
            total_txs = len(sigs)

    return {"slot": slot, "txIndex": tx_index, "totalTxs": total_txs}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
