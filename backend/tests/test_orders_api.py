def test_create_session_place_order_get_snapshot(client):
    session_resp = client.post('/sessions', json={'mode': 'LIVE', 'symbol': 'MSFT'})
    assert session_resp.status_code == 200
    session_id = session_resp.json()['session_id']

    order_resp = client.post(
        f'/sessions/{session_id}/orders',
        json={'user_id': 'u1', 'type': 'LIMIT', 'side': 'B', 'qty': 10, 'price': 100.25, 'tif': 'DAY'}
    )
    assert order_resp.status_code == 200
    assert order_resp.json()['status'] in {'LIVE', 'PARTIAL', 'FILLED'}

    book_resp = client.get(f'/sessions/{session_id}/book?levels=20')
    assert book_resp.status_code == 200
    assert 'bids' in book_resp.json()
