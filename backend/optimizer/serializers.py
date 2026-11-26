from rest_framework import serializers

class OptimizationInputSerializer(serializers.Serializer):
    stock = serializers.IntegerField(
        min_value=1,
        max_value=1_000_000,
    )

    reference_price = serializers.FloatField(
        min_value=0.000001,
        max_value=1_000_000_000,
    )

    unit_cost_ratio = serializers.FloatField(
        min_value=0.0,
        max_value=0.99,
    )

    weekly_average_units_sold = serializers.FloatField(
        min_value=1,
        max_value=1_000_000,
    )

    demand_ratio = serializers.FloatField(
        min_value=0.1,
        max_value=2.0,
    )

    elasticity = serializers.FloatField(
        min_value=-5.0,
        max_value=-0.1,
    )

    weeks = serializers.IntegerField(
        min_value=1,
        max_value=6,
    )

    discount_options = serializers.ListField(
        child=serializers.IntegerField(
            min_value=0,
            max_value=80,
        ),
        min_length=2,
        max_length=10,
    )