# apply
System for applying for positions within UTN



## Docker
Note that you must have the .env file in the root folder for everything to work!

# To start docker
docker-compose up --build  # Builds and starts all services

# To restart docker
docker-compose restart  # Restarts all services

# To stop and remove Docker-containers
docker-compose down  # Stoppar och tar bort containrar och nätverk

# To stop and remove Docker containers and volumes (if you want to reset the database for example)
docker-compose down --volumes  # Stoppar och tar bort containrar, nätverk och volymer


# After you have started docker
After you have started docker you will have a database (postgres) and a server that runs on localhost:8000

Now you can cd into frontend/apply and run npm run dev
