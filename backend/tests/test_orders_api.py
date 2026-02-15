from fastapi.testclient import TestClient

from app.main import app


def test_create_session_place_order_and_book():
    with TestClient(app) as client:
        session = client.post('/sessions', json={'mode': 'LIVE', 'symbol': 'BTC-USD'}).json()
        sid = session['id']
        placed = client.post(
            f'/sessions/{sid}/orders',
            json={'user_id': 'u1', 'type': 'LIMIT', 'side': 'B', 'qty': 2, 'price': 100.0, 'tif': 'DAY'},
        )
        assert placed.status_code == 200
        snap = client.get(f'/sessions/{sid}/book?levels=10')
        assert snap.status_code == 200
        assert 'bids' in snap.json()
