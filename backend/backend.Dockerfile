# official Python image
FROM python:3.12

# set working directory in container
WORKDIR /app

# Needed to run manage.py setup_legacy_schema.py
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# copy dependencies file and install dependencies, requirements.txt is taken from old project
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy the whole project (including manage.py in the root dir)
COPY . .

# switch to backend directory
WORKDIR /app/backend

# expose port 8000 for Django
EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
