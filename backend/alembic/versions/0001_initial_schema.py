"""initial_schema

Revision ID: 0001
Revises:
Create Date: 2026-04-03

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "upload_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("uploaded_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime, nullable=True),
        sa.Column("customer_count", sa.Integer, nullable=True),
    )

    op.create_table(
        "customers",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("phone", sa.String(10), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("province", sa.String(100), nullable=True),
        sa.Column("sp", sa.String(100), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("registration_date", sa.Date, nullable=True),
        sa.Column("first_purchase_date", sa.Date, nullable=True),
        sa.Column("last_purchase_date", sa.Date, nullable=True),
        sa.Column("total_purchases", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Float, nullable=True),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("loyalty_level", sa.String(50), nullable=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "customer_products",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "customer_id",
            sa.Integer,
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("product_key", sa.String(50), nullable=False),
        sa.Column("amount", sa.Float, nullable=True),
        sa.Column("purchase_date", sa.DateTime, server_default=sa.func.now()),
        sa.Column("source", sa.String(50), nullable=False, server_default="excel_import"),
        sa.UniqueConstraint("customer_id", "product_key", name="uq_customer_product"),
    )


def downgrade() -> None:
    op.drop_table("customer_products")
    op.drop_table("customers")
    op.drop_table("upload_sessions")
