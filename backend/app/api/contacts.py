from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.models import Contact, User, Notification
from app.schemas.schemas import ContactCreate, ContactResponse, ContactUpdate
from app.authentication.jwt_handler import get_current_user

router = APIRouter()

@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_contact(contact_in: ContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find contact user in DB
    contact_user = db.query(User).filter(User.username == contact_in.contact_username).first()
    if not contact_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    if contact_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add yourself as a contact"
        )

    # Check if contact relationship already exists
    existing_contact = db.query(Contact).filter(
        (Contact.user_id == current_user.id) & (Contact.contact_user_id == contact_user.id)
    ).first()
    if existing_contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contact relationship already exists with status: {existing_contact.status}"
        )

    # Create the contact request (sender side: pending status)
    new_contact = Contact(
        user_id=current_user.id,
        contact_user_id=contact_user.id,
        nickname=contact_in.nickname,
        status="pending"
    )
    
    # Also create counter contact on receiver's end in pending_invite status
    counter_contact = Contact(
        user_id=contact_user.id,
        contact_user_id=current_user.id,
        nickname=None,
        status="pending_invite"
    )

    # Create a push/in-app notification
    notification = Notification(
        user_id=contact_user.id,
        title="New Contact Request",
        body=f"{current_user.username} sent you a contact request.",
        type="contact_request"
    )

    db.add(new_contact)
    db.add(counter_contact)
    db.add(notification)
    db.commit()
    db.refresh(new_contact)
    
    return new_contact

@router.get("", response_model=List[ContactResponse])
def list_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    return contacts

@router.put("/{contact_id}", response_model=ContactResponse)
def respond_contact_request(contact_id: str, update_in: ContactUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Load contact
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact request not found"
        )

    # Load counter relationship (sender's record)
    counter_contact = db.query(Contact).filter(
        Contact.user_id == contact.contact_user_id,
        Contact.contact_user_id == current_user.id
    ).first()

    if update_in.status == "accepted":
        contact.status = "accepted"
        if counter_contact:
            counter_contact.status = "accepted"
            
        notification = Notification(
            user_id=contact.contact_user_id,
            title="Contact Request Accepted",
            body=f"{current_user.username} accepted your contact request.",
            type="general"
        )
        db.add(notification)
    elif update_in.status == "blocked":
        contact.status = "blocked"
        if counter_contact:
            counter_contact.status = "blocked"
    else:
        # Rejected or general deletion
        db.delete(contact)
        if counter_contact:
            db.delete(counter_contact)
            
    db.commit()
    db.refresh(contact) if update_in.status in ["accepted", "blocked"] else None
    return contact

@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    # Delete counter contact
    counter_contact = db.query(Contact).filter(
        Contact.user_id == contact.contact_user_id,
        Contact.contact_user_id == current_user.id
    ).first()

    db.delete(contact)
    if counter_contact:
        db.delete(counter_contact)
    db.commit()
    return None
