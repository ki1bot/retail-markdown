from django.db import models


class SimulationRun(models.Model):
    input_data = models.JSONField()
    result_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Simulation {self.pk}"