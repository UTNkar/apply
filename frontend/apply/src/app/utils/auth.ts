"use client";
import { request, Method } from "@/utils/request";
import { useState, useEffect } from "react";

const URLs = Object.freeze({
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    SIGNUP: "/auth/signup",
    RESET_PASSWORD_EMAIL: "/auth/reset-password",
    RESET_PASSWORD: "/auth/reset",
    CHANGE_PASSWORD: "/auth/change-password",
});

/**
 * React hook that checks if the user is logged in.
 * Automatically checks on mount and provides loading state.
 * 
 * @returns Object containing:
 *   - isLoggedIn: boolean indicating if user is logged in
 *   - loading: boolean indicating if the check is in progress
 *   - recheck: function to manually trigger a recheck
 */
export function useIsLoggedIn() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    const checkLoginStatus = async () => {
        setLoading(true);
        try {
            const response = await request(Method.GET, "/account");
            setIsLoggedIn(response.status === 200);
        } catch {
            setIsLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkLoginStatus();
        window.addEventListener('logged-in', checkLoginStatus);
        window.addEventListener('logged-out', checkLoginStatus);
        return () => {
            window.removeEventListener('logged-in', checkLoginStatus);
            window.removeEventListener('logged-out', checkLoginStatus);
        };
    }, []);

    return { isLoggedIn, loading, recheck: checkLoginStatus };
}

/**
 * Sends a sign-in request to the server with the provided identifier and password.
 *
 * @param identifier - The email address or personal identity number of the user
 * @param password - The password of the user
 * @returns status 200:  When login is successful
 * @returns status 401:  When provided credentials are invalid.
 * @returns status 403:  When user is not allowed to login.
 * @throws Error if the request fails
 */
export function logIn(identifier: string, password: string) {
    return request(Method.POST, URLs.LOGIN, { identifier, password });
}

/**
 * Logs out the user by sending a logout request to the server.
 *
 * @returns A promise that resolves to the JSON response from the server
 * @returns status 200:  When logout is successful
 * @throws Error if the request fails
 */
export function logOut() {
    return request(Method.POST, URLs.LOGOUT);
}

/**
 * Sends a sign-up request to the server with the provided registration data.
 *
 * @param payload - The registration payload
 * @returns A promise that resolves to the JSON response from the server
 * @returns status 201:  When signup is successful
 * @returns status 400:  When provided credentials are invalid.
 * @throws Error if the request fails
 */
export function signUp(payload: {
    ssn: string;
    password: string;
    study_program_id?: string;
    section_id?: string;
}) {
    return request(Method.POST, URLs.SIGNUP, payload);
}

/**
 * UNSTABLE: May change in the future to use or include SSN
 * Sends a password reset email to the user.
 *
 * @param email - The email address of the user
 * @returns A promise that resolves to the JSON response from the server
 * @returns status 200:  When email is sent successfully
 * @returns status 400:  When provided credentials are invalid.
 * @throws Error if the request fails
 */
export function resetPasswordEmail(email: string) {
    return request(Method.POST, URLs.RESET_PASSWORD_EMAIL, { email });
}

/**
 * Resets the user's password using the provided token and new password.
 *
 * @param id - The ID of the verification, exists in the magic link
 * @param token - The password reset token sent to the user's email, exists in the magic link
 * @param newPassword - The new password for the user
 * @returns A promise that resolves to the JSON response from the server
 * @returns status 200:  When password reset is successful
 * @returns status 400:  When provided credentials are invalid.
 * @throws Error if the request fails
 */
export function resetPassword(id: string, token: string, newPassword: string) {
    return request(Method.POST, URLs.RESET_PASSWORD, { id, token, newPassword });
}

/**
 * Changes the user's password using the provided old and new passwords.
 * Requires the user to be logged in.
 *
 * @param oldPassword - The current password of the user
 * @param newPassword - The new password for the user
 * @returns A promise that resolves to the JSON response from the server
 * @returns status 200:  When password change is successful
 * @returns status 400:  When provided credentials are invalid.
 * @throws Error if the request fails
 */
export function changePassword(oldPassword: string, newPassword: string) {
    return request(Method.POST, URLs.CHANGE_PASSWORD, { oldPassword, newPassword });
}


