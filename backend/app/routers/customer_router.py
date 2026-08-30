from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Shop, Customer, Invoice
from app.schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from app.dependencies import get_current_shop

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def get_customers(
    search: Optional[str] = None,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    query = db.query(Customer).filter(Customer.shop_id == current_shop.id)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(s)) |
            (Customer.phone.ilike(s)) |
            (Customer.email.ilike(s))
        )
    
    customers = query.order_by(Customer.name.asc()).all()
    results = []
    for c in customers:
        # Calculate stats
        stats = db.query(
            func.count(Invoice.id).label("total_orders"),
            func.coalesce(func.sum(Invoice.total_amount), 0.0).label("total_spent")
        ).filter(Invoice.customer_id == c.id, Invoice.shop_id == current_shop.id).first()

        res = CustomerResponse(
            id=c.id,
            shop_id=c.shop_id,
            name=c.name,
            phone=c.phone,
            email=c.email,
            address=c.address,
            total_orders=stats.total_orders if stats else 0,
            total_spent=stats.total_spent if stats else 0.0,
            created_at=c.created_at
        )
        results.append(res)
    return results


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    customer = Customer(
        shop_id=current_shop.id,
        name=payload.name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        email=payload.email.strip().lower() if payload.email else None,
        address=payload.address
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return CustomerResponse(
        id=customer.id,
        shop_id=customer.shop_id,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        total_orders=0,
        total_spent=0.0,
        created_at=customer.created_at
    )


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.shop_id == current_shop.id
    ).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if payload.name is not None:
        customer.name = payload.name.strip()
    if payload.phone is not None:
        customer.phone = payload.phone.strip()
    if payload.email is not None:
        customer.email = payload.email.strip().lower()
    if payload.address is not None:
        customer.address = payload.address

    db.commit()
    db.refresh(customer)

    stats = db.query(
        func.count(Invoice.id).label("total_orders"),
        func.coalesce(func.sum(Invoice.total_amount), 0.0).label("total_spent")
    ).filter(Invoice.customer_id == customer.id, Invoice.shop_id == current_shop.id).first()

    return CustomerResponse(
        id=customer.id,
        shop_id=customer.shop_id,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        total_orders=stats.total_orders if stats else 0,
        total_spent=stats.total_spent if stats else 0.0,
        created_at=customer.created_at
    )


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.shop_id == current_shop.id
    ).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    db.delete(customer)
    db.commit()
    return None
