import requests
from requests.auth import HTTPBasicAuth

UNICORE_URL = 'https://unicorecustomapi.mecenat.com/utn' #borde sättas i settings eller liknande

class unicoremember:
    
    def get_request(self, path):
        """
        Helper function to make a get request to unicore
        """
        request = requests.get(
            f'{UNICORE_URL}/{path}',
            auth=HTTPBasicAuth('admin', 'admin') #admin admin är bara placeholder, ska hämtas från settings eller liknande
        )
        return request

    def get_user_data(self, ssn):
        """
        Get user data from unicore based on a users ssn
        """
        request = self.get_request('user/' + str(ssn))
        if request.status_code == 200:
            response = request.json()

            if response['Personnr'] is None: #utbytesstudenter har inget personnummer,unicore lagrar deras personnummer i medlemsnummer i medlemsnummret
                response['Personnr'] = response['Medlemsnr']

                return{
                    'ssn': response['Personnr'],
                    'firstname': response['Fornamn'],
                    'lastname': response['Efternamn'],
                    'email': response['Epost'],
                    'phone_number': response['Telefon'],
                    'unicore_id': response['Id'],
                }
    
    def is_member(self, ssn):
        """
        Check if a user is a member of UTN
        """
        request = self.get_request('is-member/' + str(ssn))

        if request.status_code == 200:
            response = request.json()
            return response['Member']
        else:
            return False
    

        
