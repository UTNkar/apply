import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings


class unicoremember:

    def get_request(self, path):
        """
        Helper function to make a get request to unicore
        """
        request = requests.get(
            f"{settings.UNICORE_URL}/{path}",
            auth=HTTPBasicAuth(settings.UNICORE_USER, settings.UNICORE_PASSWORD),
            params={"ordId": settings.UNICORE_ORG_ID},
        )
        return request

    def get_user_data(self, ssn):
        """
        Get user data from unicore based on a users ssn
        """
        request = self.get_request("user/" + str(ssn))
        if request.status_code == 200:
            response = request.json()

            if response["Personnr"] is None:
                # utbytesstudenter har inget personnummer,unicore lagrar deras personnummer i medlemsnummer i medlemsnummret
                response["Personnr"] = response["Medlemsnr"]

            return {
                "ssn": response["Personnr"],
                "firstname": response["Fornamn"],
                "lastname": response["Efternamn"],
                "email": response["Epost"],
                "phone_number": response["Tele1"],
                "unicore_id": response["Id"],
            }
        else:
            return None

    def is_member(self, ssn):
        """
        Check if a user is a member of UTN
        """
        request = self.get_request("is-member/" + str(ssn))

        if request.status_code == 200:
            response = request.json()
            return response["Member"]
        else:
            return False

    def get_member_since(self, ssn):
        """
        Get the date a user became a member

        Returns a string in the format YYYY-MM-DD, or True if the user is a
        member but the date is unknown, or False if the user is not a member.
        """
        member_request = self.get_request("is-member/" + str(ssn))
        if member_request.status_code == 200:
            member_response = member_request.json()
            if not member_response["Member"]:
                # The user is not a member
                return False
        else:
            raise Exception("Failed to get member status from Unicore")

        user_request = self.get_request("user/" + str(ssn))
        if user_request.status_code == 200 and member_request.status_code == 200:
            response = user_request.json()
            if response["Betalningdatum"] is not None:
                # This is the date the user became a member
                return response["Betalningdatum"].split("T")[0]
            else:    
                # We don't know when the user became a member
                return True
