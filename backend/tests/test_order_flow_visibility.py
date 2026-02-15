from pprint import pformat


def _print_state(client, session_id: str, label: str) -> None:
    book = client.get(f"/sessions/{session_id}/book?levels=10").json()
    client_u1_orders = client.get(f"/sessions/{session_id}/orders?user_id=u1").json()
    client_u2_orders = client.get(f"/sessions/{session_id}/orders?user_id=u2").json()
    admin_orders = client.get(f"/sessions/{session_id}/orders").json()

    print(f"\n=== {label} ===")
    print("Order book:")
    print(pformat(book))
    print("Client u1 orders:")
    print(pformat(client_u1_orders))
    print("Client u2 orders:")
    print(pformat(client_u2_orders))
    print("Admin/all orders:")
    print(pformat(admin_orders))



def test_order_flow_visibility_for_client_and_admin(client):
    session_resp = client.post('/sessions', json={'mode': 'LIVE', 'symbol': 'MSFT'})
    assert session_resp.status_code == 200
    session_id = session_resp.json()['session_id']

    place_u1 = client.post(
        f'/sessions/{session_id}/orders',
        json={'user_id': 'u1', 'type': 'LIMIT', 'side': 'B', 'qty': 10, 'price': 100.0, 'tif': 'DAY'},
    )
    assert place_u1.status_code == 200
    u1_order_id = place_u1.json()['order_id']
    _print_state(client, session_id, 'after u1 limit buy')

    place_u2 = client.post(
        f'/sessions/{session_id}/orders',
        json={'user_id': 'u2', 'type': 'LIMIT', 'side': 'S', 'qty': 4, 'price': 101.0, 'tif': 'DAY'},
    )
    assert place_u2.status_code == 200
    u2_order_id = place_u2.json()['order_id']
    _print_state(client, session_id, 'after u2 resting limit sell')

    place_u2_market = client.post(
        f'/sessions/{session_id}/orders',
        json={'user_id': 'u2', 'type': 'MARKET', 'side': 'S', 'qty': 3},
    )
    assert place_u2_market.status_code == 200
    _print_state(client, session_id, 'after u2 market sell')

    modify_u2 = client.post(
        f'/sessions/{session_id}/orders/{u2_order_id}/modify',
        json={'price': 100.0, 'qty': 4},
    )
    assert modify_u2.status_code == 200
    modified_u2_order_id = modify_u2.json()['order_id']
    _print_state(client, session_id, 'after u2 modify')

    cancel_modified = client.post(f'/sessions/{session_id}/orders/{modified_u2_order_id}/cancel')
    assert cancel_modified.status_code == 200
    _print_state(client, session_id, 'after cancel modified u2 order')

    u1_orders = client.get(f'/sessions/{session_id}/orders?user_id=u1').json()
    u2_orders = client.get(f'/sessions/{session_id}/orders?user_id=u2').json()
    admin_orders = client.get(f'/sessions/{session_id}/orders').json()

    assert all(order['user_id'] == 'u1' for order in u1_orders)
    assert all(order['user_id'] == 'u2' for order in u2_orders)
    assert len(admin_orders) >= len(u1_orders) + len(u2_orders)

    visible_client_order_ids = {order['id'] for order in u1_orders + u2_orders}
    visible_admin_order_ids = {order['id'] for order in admin_orders}
    assert visible_client_order_ids.issubset(visible_admin_order_ids)
    assert u1_order_id in visible_admin_order_ids
    assert modified_u2_order_id in visible_admin_order_ids

    final_book = client.get(f'/sessions/{session_id}/book?levels=10').json()
    assert 'bids' in final_book
    assert 'asks' in final_book
