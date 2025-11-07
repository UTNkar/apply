from .models import Member
from backend.utils.unicore import unicoremember


"""
Creates a user
Attributes:
    email: The email of the user
    phone_number: The phone number of the user
    is_superuser: If the user is a superuser
    is_staff: If the user is staff
    name: The name of the user
    ssn: The social security number of the user
    study_program: The study program of the user
    registrasion_year: The year the user registered
    password: The password of the user
"""

def _create_user(email, phone_number, is_superuser, is_staff, 
                name, ssn, study_program, registrasion_year, password):
    
    user = Member.objects.create(
        email= email,
        phone_number= phone_number,
        is_superuser= is_superuser,
        is_staff= is_staff,
        name= name,
        ssn= ssn,
        study_program= study_program,
        registration_year= registrasion_year
    )
    user.set_password(password)
    user.save()
    return user


"""
Creates a user from a ssn if the user is a member of UTN
Attributes:
    ssn: The social security number of the user
    study_program: The study program of the user
    registrasion_year: The year the user registered
    password: The password of the user
    email: The email of the user (optional)
    phone_number: The phone number of the user (optional)
    is_superuser: If the user is a superuser
    is_staff: If the user is staff
    name: The name of the user (optional)
"""
def create_user(ssn, study_program, registrasion_year, password, 
                email=None, phone_number=None, is_superuser=False, is_staff=False, name=None):
    
    data = unicoremember.get_user_data(ssn)
   
    #TODO lägg till try catch?
    if data is not None:
        name = "{} {}".format(
            data['firstname'].strip(),
            data['lastname'].strip()
            )
        
        #TODO lägg till status när vi listat ut de
        user = _create_user(
            unicore_id= data['unicore_id'].strip(),
            email= data['email'].strip(),
            phone_number= data['phone_number'].strip(),
            is_superuser= False,
            is_staff= False,
            name= name,
            ssn= data['ssn'].strip(),
            study_program= study_program,
            registration_year= registrasion_year  
        )

    else:
        user = _create_user(email, phone_number, is_superuser, is_staff, 
                name, ssn, study_program, registrasion_year, password)


    return user

def create_super_user(ssn, study_program, registrasion_year, password, 
                email=None, phone_number=None, is_superuser=True, is_staff=True, name=None):
    data = unicoremember.get_user_data(ssn)
   
    #TODO lägg till try catch?
    if data is not None:

        name = "{} {}".format(
            data['firstname'].strip(),
            data['lastname'].strip()
            )
        
        #TODO lägg till status när vi listat ut de
        user = _create_user(
            unicore_id= data['unicore_id'].strip(),
            email= data['email'].strip(),
            phone_number= data['phone_number'].strip(),
            is_superuser= False,
            is_staff= False,
            name= name,
            ssn= data['ssn'].strip(),
            study_program= study_program,
            registration_year= registrasion_year  
        )

    else:
        user = _create_user(email, phone_number, is_superuser, is_staff, 
                name, ssn, study_program, registrasion_year, password)

    return user

