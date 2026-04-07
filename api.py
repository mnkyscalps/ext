"""
Axiom TX Info API

Install:  pip install -r requirements.txt
Run:      uvicorn api:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === CONFIG ===
RPC_URL = "https://api.mainnet-beta.solana.com"  # Replace with your RPC

# === TIP ADDRESSES ===
# Known tip/MEV addresses for various providers
TIP_ADDRESSES = {
    # Jito
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
    # 0SLOT
    "2zzLHxYW6x7Q2vqJi5TRXBP2Y4pqf7D3xR1hhN8iNmHW",
    "EE5xeU4cGxDjQ6jzKxDYP2HJLs22oNdmGJrJBg9HVyXA",
    "3K4ZfBpX5y4ufCjWAjf8xKzNbKRPDyD7m3hf1wSBrxpA",
    "6fv1D7MBJJdMhSK1Z6mJQUr3xFYKA8CZNvUKmLdPPyAR",
    "9qxQgdC2qZ9ysR7LJAJNvWcdDmx7qLNZHPJZQWGGDPbJ",
    "7bKCZkCd2zZxJ3xJQ7EdKvqfZbBCPn3QQV7KHLALoHQ8",
    "ArKGHRXqbdNF9F3mfCCBN1vA7gC2kw8HjK8Hfnir9qWA",
    "BvMEYqKVRNQHqRtMsw4y9XYvCFQcMKMhsMZJdCMZp8LS",
    "DkF5xPgC6ZgBhWL6urMq4XVPHNE8V7gB1mHrSLsymRUy",
    "FBwcufBRNxQ1P5X3hftASFLvdU7NZoLDvhMdpH7sVk8R",
    "GvCE3F7uASjTsP8djAHxwC1VLzKKVGz9DJAG8VG1uwUH",
    "HDQSZHGV9VXfb7ULr33JDf3nEgvLF7gEhmSqV7xTdLHr",
    "5dE3cDaM6h8qhUb6bMwKTDqSBEfD5dzqAvRAJ6TFNZUw",
    "3CtEBGjQjHcNBqj7ufq2zTQTGMTkiW8QpTfnVYCp2qLD",
    "2xL2hFFyzTjCRvjxB43UvoLYBq5F3i6vkPNiq1btb3PJ",
    "2Rsad11dXeRzDGNJ1mXgM8A2VLJGQdLs1hs9Jdsy42gB",
    "pHEXRatA1eSvjQQPCYgCfDxCnfyQ3LF7kzGHnwTdX5S",
    "bSXDkFuCUBe8gT47cPfTLuqH5cXP1y6JDJn22oSHnAT",
    "dWKePuzS6UBzDPg5Ky7mLwYqKAfPbkqYxrQCwJNJyRk",
    "fWKePuzS6UBzDPg5Ky7mLwYqKAfPbkqYxrQCwJNJyRk",
    "eWKePuzS6UBzDPg5Ky7mLwYqKAfPbkqYxrQCwJNJyRk",
    # Astralane
    "4bfHvLEqPTMaAJJ3njEKvihYgYWYNYHXuDPJzrSo9vbC",
    "5aMqBSrv3kBCXE3vwQgF5qbNhxVzSyzWZGe8z8qc3Poe",
    "6dxT4xmTunwXEFz3oK5xz5kMLJPdNqC5KvGFmCAFQAKs",
    "9nqqLuEYeQAVRFiDH4LrdcK6wdFPdVE95NeabCz14vSn",
    "astra1JJwqJMwJTDBY1SWRB1PUEAGP2xtrQ2d1CgPfBw",
    "astRKGbwFbXw8GUECqnTBqreCHvPvuS4c7TzZBRXzVz",
    "astrn7pGT3eF3GrGTg3QYVARGEh4QqvSRBm22bRgqG1",
    "AstrnjHnhJRfm2vGYzCPU4rkrRESswjBupWdGyfdWMHC",
    "AstrnLVez77PJ6tq7qP1z2qyVGEVJhxrGi6jwLM3bWGo",
    "AstrondLhexScPZ2JR2DJLmxJRLgvqqbqSCNX4BHHyAz",
    "AstronoxSkhpvMPh3EhJQh3TSqGSGvyP9DPu2akzmj8k",
    "Astropay88J2ZUgKJnRAjQnuuxKuPfvPACrz2nVSWQAT",
    "Astrovns2ZmidXYELF2c1sjb2jCpSNtqSaWE2CVdMHGm",
    "2Txf8vRoANWXsgZS8DKPAJ2b3e4kKMCAYPZaGz1Hvk7W",
    "3SnNkvJAK8jGZxvRygLgBNDLhZvVfiPaA4Tho8TpXFYK",
    "HMkwvSfPvGGdKXftcB4Ni7gNLHZhcniTvhRqt7fboxUP",
    # Lunar Lander / HelloMoon
    "HLoo3Xq1os2h6hnP5Lr8bdaZM7UPneSaHVYSPLpxA7ok",
    "HLoo5uA5P3vu1LZsmP5B2e5d92sJaJkGYRHc3Pt4TJVf",
    "hmoonePfzPT8BEMQCiEZsXLiKfwhvQV9WaNWvADqfXP",
    # Blocksprint
    "BSprwbJVcz8TGPMYSbZnvDgUfN5Pd12pBJcxE94uk9qn",
    "BSprwidsbgB6hY97og7x81gNt4assVJCn7sYVxH2Mt5X",
    "BSprqHvnYnJ3YGWwj7M69VBFYk7bKxGdqLUqkYs9LUk5",
    # Soyas
    "soyas6ydPxU7Lg2jq1Xd6qH9kHr6gMJJZiNCBHZxGLb",
    # Helius
    "Tip1JcbBsWXKNiKVZ4VHj4iqsCtDQBdNJxsXExnDG4M",
    # Nextblock
    "NEXThC18bKPtVHLBFe78jnqTTDGF3SBQwPxfT2kqbPK",
    "next3dnZXMWE42Hc8ELfEhEVHacgWR8zBUDxRNVNYRFa",
    "nExtEQFE1kcLZ3TahJM1cgjmqNqKfkKDa1RiCGLQJD3",
    "nExTBPDU9PtJzw3PW2pPnTv6DxmJP4nd2Lj9RxRGawz",
    "neXttWbEJKrSdHCtv3hzBHNKR8cdpvykyKAb3bnz3SQ",
    "neXtHEZBv6oqf9iDUv4Xz19bDwNJcDAqg6Md2WT4Dh3",
    "nEXtb6bQ2ULaKARDJJVw4Q4GkJyiTYAFdWvaDHBVdKk",
    # bloXroute
    "bLoxP5J6A6jKk2gg3YBpTvPmUEWdXaYsYLxqC9A5WXF",
    "bloXu66Fn8PRNUJ2iyZD9fcfBhxiHZDJFJPX1YJsVzBs",
    "bloXGwvMWZj5BbhSLzSMWRqPqMvkBbdNpaTzS4bJzQb",
    "bloXhLF3G2TrDiPA4sF5xnEsz1cZfxH59a4J7r5r5Hz",
    "bloXcNhqM4crihfvYST3gZRUTMCJCYN7TZGdU8pwKAi",
    "bloXdQTL1oYqK9RYgjMH1BVZR3tSm7G66kz3uVq7MZL",
    "bLoxjz4BbG7WhD86FntpbEQfq1aQR1xVGkPPmqBiHGP",
    "bloXq6BTCnfZTMWNGLahtUYmQvbugN6qqtVdpyHBgPF",
    "bLoXLKMNjuY3eqfG81SjEqTGurCcToiDuSnvGLVpkJV",
    "bLoXKnNQEVW7PtQRGRJpiJbgb9LqnXCQWSX5vdx1H9D",
    "bLoXCp2FPoUdRDyXTHAevaRyWGTj6Bc2LPozNrQ8HfM",
    "bLoxhPTxBv5VRGWnHLSR7PJ4S1jhdVsm2HsJJ5r4Z7c",
    "bLoxJWrYDpT3eCunPkqSdsrpTxqtcjnS2rbxcazQRep",
    "bLoXpbFEi3Dy8ABuhR3Cj3RZ3NiHmKXwBaC8qNcLULe",
    "bLoXrjLHT1nT2ZtLVhT8akxDq1SvgKkaDQrTu9kYnFN",
    "bLoXsAWb6xjKpA6bSMg4HBb8VzCQA6PBXB4YqgSRFVt",
    "bLoxWk4Sxc4sJYAaGQZmP3X5E8dgERcqxP2mq9cfXvv",
    "bLoXzWc2W3pv2Ub8j56D4irMj9oWWuE7NnSgVbNgRkR",
    "bLoxG1nJTNjRxnxaR6aq2N6cFp7bE7vPHaWoaPRRusk",
    "bLoXdN2Gy2Tiq1ixjcZ59oHMNoJaLJYv5g6UDbD6N9F",
    "bLoxZE7Wq6k7WVXnbLHVaZRiXBi2RpCf8r3bSDaBK3J",
    "bLoX1o8rV8ZHVrjcJbrWWc6w3zyJEzE5Y6BNYdW3nFs",
    "bLoxXp6BHfUBMDCDHoF1jhM9GRsaxpqKqRexdT1BAXR",
    # Stellium
    "steLJP51wH4Jm2dZqBYTJy2xUSjyRqSSiSv4BDPWBL6",
    "STE3f7VQR8jaSs29xBWFChkKm1rG5Z23aLDCJjjYJEr",
    "STE7AMRPSBzV3CZ36nRYaHChBqc7d2WxEUW2tPheJMn",
    "STE13tU1ZT63njT4LK4XWERaCz3L4EfJHdB1VdYCLs7",
    # Blockrazor
    "7PXHoSk6pwP1Z2aQ32wpM9pqZMfEAWu1d53F1WVbnxkM",
    "BLokRv2LMhffKx8NDdRH3RcULJSfKGsdW4DqxWYLiMyU",
    # Falcon
    "FLCNwxsPpELTYPCpGwqfGNxKv1x9H5KGsP7aZwYvkzfa",
    # Node1
    "Node1p9TQrKh2ZwY3SdXnzq8AauK4xUK5r4v9BLuJmq",
    "Node1qBE7jsTxR8RPaWpzpGXPCBLkGz5EbwuEamvkLL",
    "Node1rm1NZ95Xh4qk3tcKqCEQo3J2j9LEzCfKHi7h2o",
    "Node1pNLGvtLNELzwJi3WS3QDuEjfP4Hw8NEsCQ1EVf",
    # Raiden
    "raydMmGNe3TyKEGcADjZBbDTnZ3iYzXLBi4Mvq2mhyU",
    "RAYdiLgPbQkLtC29dt4KWEfDYLPuTHJXRkxsPu1wZyC",
    "RAYD1e3nwkLiNb9hpfnYTVt5fEtJiWJTpVJmCH3AVZG",
    "RAydp4uxnWbwHqn7n3bx95W8UA3u2DWuFE4qDcaEdwt",
    "raYDk9hbfDsjMTpuiN8H9k2rJjS8FZNXUSkrwmjt7oS",
    # Temporal/Nozomi
    "TEMPsTYL1GhHqbtdDSbSvT9z6GZ65Q9HCZk3DkD6HbJ",
    "tempAV3P8rP72YpGNk9BwFcz9jUQP17bLHwxw1cX4Dp",
    "TEMPMCwoPcXaXU3oH6kBUCn7YQq9nSQTMEhxs5EHZA8",
    "tempXaLDMb9VX4xj1pPJmWVt7Xn8UCXwuJPNkXPvjFv",
    "TEMPvYkKR8XaLeHdGNjPhTRPwSgPYzTTGbk6xhvJzjN",
    "tempLTQ7bQy8VHvVmMc3USdDAqM83XMBRLV2vpcFxVx",
    "TEMPasMxGxDy3fWamF7yvwPNpAj6vCsnLCVTGiAJCu3",
    "temps9EZZgwKm9GSWfMqRXFCYkZg7A66V4B1XnJqA8p",
    "TEMPEiMqkwCKLVPuN2SdBUVkEDy62Uk7W7HFvP3vrBV",
    "temPER3oDVR2dmRJbzW7QUMJTFoxY9YfgCecB8MKJSF",
    "tempNqvvC68d5j4QDJ5fCfiAz9PJ4h8vxM2k7Uvji1P",
    "TEMpXMRhQdYqM6CtaayQ6MwVw27Ty5Z8HzMM5cMfPaV",
    "TEMP4gW6Y4K6JRqXxvWa5UCBJ1LqjyJqYBVH1CysUnap",
    "TEMPpRkYCELPpduT6qCtgvRy8pzY4tAL7DZDJ2nD1LB",
    "tempHLK2Eyx7fXVbxcAWwGaKv2F8oKAnBnA4MtgWP2P",
    "TEMPBw8Tk3bJxXZdPD4M2MTXLjnHyvdDQufVe5xvUCy",
}

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
            error = data["error"]
            logger.warning(f"RPC error for {method}: {error}")
            # Return None instead of raising for getBlock (non-critical)
            if method == "getBlock":
                return None
            raise HTTPException(400, error)
        return data.get("result")


@app.get("/")
async def root():
    return {"status": "ok"}


SOLANA_VIEW_API = "https://transition-api.solanaview.com"


@app.get("/block/{slot}/info")
async def get_block_info(slot: int):
    """Proxy to solanaview block info API"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.get(f"{SOLANA_VIEW_API}/block/{slot}/info")
            if res.status_code != 200:
                raise HTTPException(res.status_code, "Block not found")
            return res.json()
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout fetching block info")
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/validator/{pubkey}/info")
async def get_validator_info(pubkey: str):
    """Proxy to solanaview validator info API"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.get(f"{SOLANA_VIEW_API}/validator/{pubkey}/info")
            if res.status_code != 200:
                raise HTTPException(res.status_code, "Validator not found")
            return res.json()
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout fetching validator info")
    except Exception as e:
        raise HTTPException(500, str(e))


def extract_tip_amount(tx: dict) -> int:
    """Extract tip amount by finding transfers to known tip addresses."""
    tip_total = 0
    meta = tx.get("meta", {})
    message = tx.get("transaction", {}).get("message", {})

    # Check inner instructions (most tips are in inner instructions from programs)
    inner_instructions = meta.get("innerInstructions", [])
    for inner in inner_instructions:
        for ix in inner.get("instructions", []):
            if ix.get("program") == "system" and ix.get("parsed", {}).get("type") == "transfer":
                info = ix["parsed"].get("info", {})
                destination = info.get("destination", "")
                if destination in TIP_ADDRESSES:
                    tip_total += info.get("lamports", 0)

    # Also check top-level instructions
    instructions = message.get("instructions", [])
    for ix in instructions:
        if ix.get("program") == "system" and ix.get("parsed", {}).get("type") == "transfer":
            info = ix["parsed"].get("info", {})
            destination = info.get("destination", "")
            if destination in TIP_ADDRESSES:
                tip_total += info.get("lamports", 0)

    return tip_total


@app.get("/tx/{signature}")
async def get_tx_info(signature: str):
    try:
        tx = await rpc("getTransaction", [
            signature,
            {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0, "commitment": "confirmed"}
        ])
    except HTTPException as e:
        logger.error(f"Failed to get transaction {signature[:20]}...: {e.detail}")
        raise

    if not tx:
        raise HTTPException(404, "Transaction not found")

    slot = tx["slot"]

    # Get fee from transaction meta
    fee = tx.get("meta", {}).get("fee", 0)

    # Extract tip amount from transfers to known tip addresses
    tip = extract_tip_amount(tx)

    # Try to get block info for tx index (non-critical, may fail)
    tx_index = None
    total_txs = None

    try:
        block = await rpc("getBlock", [
            slot,
            {"encoding": "jsonParsed", "transactionDetails": "signatures", "maxSupportedTransactionVersion": 0, "commitment": "confirmed", "rewards": False}
        ])

        if block and "signatures" in block:
            sigs = block["signatures"]
            if signature in sigs:
                tx_index = sigs.index(signature)
                total_txs = len(sigs)
    except Exception as e:
        logger.warning(f"Failed to get block {slot} for tx index: {e}")

    return {"slot": slot, "txIndex": tx_index, "totalTxs": total_txs, "fee": fee, "tip": tip}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
