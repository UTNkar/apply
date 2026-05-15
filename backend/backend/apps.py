from django.apps import AppConfig
import os
import sys

class BackendConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "backend"

    def ready(self):
        # Prevent running scheduler on child processes
        is_child = os.environ.get('RUN_MAIN') != 'true'
        # Only start the scheduler if running the server
        running_server = 'runserver' in sys.argv
        if running_server and not is_child:
            self.start_scheduler()

    def start_scheduler(self):
        from apscheduler.schedulers.background import BackgroundScheduler
        from django.core.management import call_command
        
        scheduler = BackgroundScheduler()
        
        def run_sync():
            try:
                print("Cron: Running daily staff status sync...")
                call_command("sync_staff_status")
            except Exception as e:
                print(f"Failed to sync staff status: {e}")

        # Run every day at night. 
        scheduler.add_job(run_sync, 'cron', hour=0, minute=30)
        scheduler.start()


