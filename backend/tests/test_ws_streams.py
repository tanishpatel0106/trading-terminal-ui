def test_ws_trade_and_orders_stream(client):
    session_resp = client.post('/sessions', json={'mode': 'LIVE', 'symbol': 'AMZN'})
    session_id = session_resp.json()['session_id']

    with client.websocket_connect(f'/ws/sessions/{session_id}/trades') as trade_ws, client.websocket_connect(f'/ws/sessions/{session_id}/orders?user_id=u1') as order_ws:
        client.post(
            f'/sessions/{session_id}/orders',
            json={'user_id': 'u1', 'type': 'LIMIT', 'side': 'B', 'qty': 10, 'price': 100.0, 'tif': 'DAY'}
        )
        msg = order_ws.receive_json()
        assert msg['event_type'] == 'ORDER_UPDATE'
