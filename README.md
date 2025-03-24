# apply
System for applying for positions within UTN





## Docker
Notera att du måste ha .env filen i root mappen för att allt ska fungera!

# För att starta Docker
docker-compose up --build  # Bygger och startar alla tjänster

# För att starta om Docker
docker-compose restart  # Startar om alla tjänster

# För att stoppa och ta bort Docker-containrar
docker-compose down  # Stoppar och tar bort containrar och nätverk

# För att också ta bort volymer (t.ex. om du vill återställa databasen)
docker-compose down --volumes  # Stoppar och tar bort containrar, nätverk och volymer
