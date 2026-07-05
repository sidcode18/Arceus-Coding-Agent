"""
conftest for agent-level tests.

These tests are pure unit tests — they mock the LLM and do not need the
FastAPI application, database, or any external services.  We deliberately
do NOT import app.main here so that env-var validation of Settings does not
interfere.
"""
import pytest
