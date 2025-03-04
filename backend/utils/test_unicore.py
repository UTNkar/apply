import unittest
from unittest.mock import patch, MagicMock
from unicore import unicoremember

class TestUnicoremember(unittest.TestCase):

    @patch('unicore.requests.get')
    def test_get_user_data_with_medlemsnr(self, mock_get):
        # Test get_user_data when 'Personnr' is None and fallback to 'Medlemsnr'
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = {
            'Personnr': None,
            'Medlemsnr': '1234567890',
            'Fornamn': 'John',
            'Efternamn': 'Doe',
            'Epost': 'john.doe@example.com',
            'Telefon': '555-1234',
            'Id': '123'
        }
        mock_get.return_value = fake_response

        unicore = unicoremember()
        data = unicore.get_user_data('1234567890')

        called_url = mock_get.call_args[0][0]
        self.assertEqual(called_url, 'https://unicorecustomapi.mecenat.com/utn/user/1234567890')
        
        expected = {
            'ssn': '1234567890',
            'firstname': 'John',
            'lastname': 'Doe',
            'email': 'john.doe@example.com',
            'phone_number': '555-1234',
            'unicore_id': '123',
        }
        self.assertEqual(data, expected)

    @patch('unicore.requests.get')
    def test_get_user_data_status_not_200(self, mock_get):
        # Test get_user_data when the response status is not 200
        fake_response = MagicMock()
        fake_response.status_code = 404
        mock_get.return_value = fake_response

        unicore = unicoremember()
        data = unicore.get_user_data('1234567890')

        called_url = mock_get.call_args[0][0]
        self.assertEqual(called_url, 'https://unicorecustomapi.mecenat.com/utn/user/1234567890')
        

        self.assertIsNone(data)

    @patch('unicore.requests.get')
    def test_is_member_true(self, mock_get):
        # Test is_member returning True when response.Member is True
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.json.return_value = {'Member': True}
        mock_get.return_value = fake_response

        unicore = unicoremember()
        result = unicore.is_member('1234567890')

        called_member_url = mock_get.call_args[0][0]
        
        self.assertEqual(called_member_url, 'https://unicorecustomapi.mecenat.com/utn/is-member/1234567890')

        self.assertTrue(result)

    @patch('unicore.requests.get')
    def test_is_member_false_response(self, mock_get):
        # Test is_member returning False when response status is not 200
        fake_response = MagicMock()
        fake_response.status_code = 400
        mock_get.return_value = fake_response

        unicore = unicoremember()
        result = unicore.is_member('1234567890')

        called_member_url = mock_get.call_args[0][0]
        
        self.assertEqual(called_member_url, 'https://unicorecustomapi.mecenat.com/utn/is-member/1234567890')

        self.assertFalse(result)

if __name__ == '__main__':
    unittest.main()