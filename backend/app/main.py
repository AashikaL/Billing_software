import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth_router,
    shop_router,
    product_router,
    customer_router,
    billing_router,
    invoice_router,
    inventory_router,
    report_router,
    ai_router,
    dashboard_router
)

# Auto create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware for Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router, prefix=settings.API_V1_STR)
app.include_router(shop_router.router, prefix=settings.API_V1_STR)
app.include_router(product_router.router, prefix=settings.API_V1_STR)
app.include_router(customer_router.router, prefix=settings.API_V1_STR)
app.include_router(billing_router.router, prefix=settings.API_V1_STR)
app.include_router(invoice_router.router, prefix=settings.API_V1_STR)
app.include_router(inventory_router.router, prefix=settings.API_V1_STR)
app.include_router(report_router.router, prefix=settings.API_V1_STR)
app.include_router(ai_router.router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to Multi-Tenant Billing & Inventory SaaS API",
        "docs": "/docs",
        "status": "healthy"
    }
