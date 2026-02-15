from app.core.config import get_settings
from app.services.broadcaster import Broadcaster
from app.services.exchange_runtime import ExchangeRuntimeManager
from app.services.persistence import PersistenceService
from app.services.replay_service import ReplayService

settings = get_settings()
persistence_service = PersistenceService()
broadcaster = Broadcaster(maxsize=settings.ws_queue_size)
runtime_manager = ExchangeRuntimeManager(broadcaster=broadcaster, persistence=persistence_service)
replay_service = ReplayService()
