import { AuthFlagGatedRoute } from "./auth-flag-gated-route";
import Reset from "./reset";
import Setup from "./setup";
import Signin from "./signin";
import SigninVerify from "./signin-verify";
import Signout from "./signout";
import Signup from "./signup";

// Render the React auth screens when the authX labs flag is enabled, and the
// Ember screens otherwise. The screens are small, so they are imported
// directly rather than lazily.

export function SigninRoute() {
    return <AuthFlagGatedRoute component={Signin} />;
}

export function SigninVerifyRoute() {
    return <AuthFlagGatedRoute component={SigninVerify} />;
}

export function SignoutRoute() {
    return <AuthFlagGatedRoute allowAuthenticated component={Signout} />;
}

export function SignupRoute() {
    return <AuthFlagGatedRoute component={Signup} />;
}

export function ResetRoute() {
    return <AuthFlagGatedRoute component={Reset} />;
}

export function SetupRoute() {
    return <AuthFlagGatedRoute component={Setup} />;
}
