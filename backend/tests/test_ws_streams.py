from fastapi.testclient import TestClient

from app.main import app


def test_ws_marketdata_receives_event():
    with TestClient(app) as client:
        session = client.post('/sessions', json={'mode': 'LIVE', 'symbol': 'ETH-USD'}).json()
        sid = session['id']
        with client.websocket_connect(f'/ws/sessions/{sid}/marketdata') as ws:
            client.post(
                f'/sessions/{sid}/orders',
                json={'user_id': 'u2', 'type': 'LIMIT', 'side': 'S', 'qty': 1, 'price': 120.0},
            )
            msg = ws.receive_json()
            assert msg['event'] in {'book_update', 'resync_required'}
