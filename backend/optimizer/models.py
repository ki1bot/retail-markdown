from django.conf import settings
from django.db import models

class SimulationRun(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="markdown_simulations",
    )

    input_data = models.JSONField()
    result_data = models.JSONField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Simulasi #{self.pk}"