from app import app as flask_app


def test_root_index_returns_html():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.content_type
