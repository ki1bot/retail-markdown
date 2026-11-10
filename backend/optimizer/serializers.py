from decimal import Decimal

from rest_framework import serializers


class SimulationSerializer(serializers.Serializer):
    stock = serializers.IntegerField(
        min_value=1,
        max_value=1000000,
    )

    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=6,
        min_value=Decimal("0.000001"),
    )

    weekly_average = serializers.IntegerField(
        min_value=1,
        max_value=1000000,
    )

    demand_ratio = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        min_value=Decimal("0.10"),
        max_value=Decimal("2.00"),
    )

    hpp_ratio = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        min_value=Decimal("0.00"),
        max_value=Decimal("1.00"),
    )

    elasticity = serializers.DecimalField(
        max_digits=3,
        decimal_places=1,
        min_value=Decimal("-2.5"),
        max_value=Decimal("-1.5"),
    )

    source = serializers.ChoiceField(
        choices=["sales", "inventory"],
    )

    year = serializers.IntegerField(
        min_value=2020,
        max_value=2035,
    )