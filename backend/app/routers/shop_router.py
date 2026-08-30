from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Shop
from app.schemas import ShopCreateUpdate, ShopResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/shop", tags=["Shop Management"])

@router.get("/profile", response_model=ShopResponse)
def get_shop_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shop associated with this account. Please complete setup."
        )
    return shop


@router.post("/setup", response_model=ShopResponse)
def setup_or_update_shop(payload: ShopCreateUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shop = db.query(Shop).filter(Shop.owner_id == current_user.id).first()
    if not shop:
        shop = Shop(owner_id=current_user.id, shop_name=payload.shop_name)
        db.add(shop)

    shop.shop_name = payload.shop_name
    shop.address = payload.address
    shop.city = payload.city
    shop.state = payload.state
    shop.pincode = payload.pincode
    shop.gstin = payload.gstin
    shop.logo = payload.logo
    if payload.invoice_prefix:
        shop.invoice_prefix = payload.invoice_prefix.upper()

    db.commit()
    db.refresh(shop)
    return shop
