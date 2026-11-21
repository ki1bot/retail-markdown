from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        (
            "optimizer",
            "0002_retail_observation_and_owner",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="retailobservation",
            name="weather_condition",
            field=models.CharField(
                blank=True,
                default="",
                max_length=40,
            ),
        ),

        migrations.AddField(
            model_name="retailobservation",
            name="competitor_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
            ),
        ),

        migrations.AddField(
            model_name="retailobservation",
            name="epidemic",
            field=models.BooleanField(
                blank=True,
                null=True,
            ),
        ),

        migrations.AddIndex(
            model_name="retailobservation",
            index=models.Index(
                fields=[
                    "source",
                    "product_id",
                    "observed_on",
                ],
                name="opt_obs_product_date_idx",
            ),
        ),
    ]