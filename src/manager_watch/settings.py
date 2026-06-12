from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
CONFIG_DIR = BASE_DIR / "config"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MW_", env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg://manager_watch:manager_watch@localhost:5432/manager_watch"
    )
    alert_webhook_url: str | None = None
    contact_email: str = "ops@example.com"

    sources_file: Path = CONFIG_DIR / "sources.yaml"
    patterns_file: Path = CONFIG_DIR / "patterns.yaml"
    league_tiers_file: Path = CONFIG_DIR / "league_tiers.yaml"
    output_dir: Path = BASE_DIR / "output"

    fetch_timeout_seconds: float = 15.0
    research_domain_delay_seconds: float = 3.0
    quorum_window_hours: int = 6
    quorum_threshold: float = 1.5
    watched_club: str = "Motherwell"

    @property
    def user_agent(self) -> str:
        return f"ManagerWatch/0.1 (+contact: {self.contact_email})"


settings = Settings()
