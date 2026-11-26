from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        (
            "optimizer",
            "0004_merge_retail_and_warehouse",
        ),
    ]

    operations = [
        migrations.DeleteModel(
            name="WarehouseSaleObservation",
        ),

        migrations.DeleteModel(
            name="RetailObservation",
        ),
    ]