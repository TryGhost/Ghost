import MainHeader from "./components/MainHeader";
import SettingSection from "./components/SettingSection";
import SettingGroup from "./components/SettingGroup";
import MenuSection from "./components/MenuSection";
import MenuItem from "./components/MenuItem";

function App() {
    return (
    <div>
        <button className="fixed top-4 left-6 text-sm font-bold text-black">&larr; Done</button>
        
        {/* Main container */}
        <div className="max-w-[1080px] flex flex-col mx-auto px-[5vmin] py-[12vmin] md:flex-row md:gap-x-10 md:py-[8vmin] md:items-start">
            
            {/* Sidebar */}
            <div className="md:top-[8vmin] flex-grow-0 md:basis-[240px] relative md:sticky">
                <MainHeader />

                <div className="hidden md:block mt-5">
                    <MenuSection name="General">
                        <MenuItem name="Title and description" />
                        <MenuItem name="Timezone" />
                        <MenuItem name="Publication language" />
                        <MenuItem name="Meta data" />
                        <MenuItem name="Twitter card" />
                        <MenuItem name="Facebook card" />
                        <MenuItem name="Social accounts" />
                        <MenuItem name="Make this site private" />
                        <MenuItem name="Users and permissions" />
                    </MenuSection>

                    <MenuSection name="Site">
                        <MenuItem name="Branding and design" />
                        <MenuItem name="Navigation" />
                    </MenuSection>

                    <MenuSection name="Membership">
                        <MenuItem name="Portal" />
                        <MenuItem name="Access" />
                        <MenuItem name="Tiers" />
                        <MenuItem name="Analytics" />
                    </MenuSection>

                    <MenuSection name="Email newsletters">
                        <MenuItem name="Newsletter sending" />
                        <MenuItem name="Newsletters" />
                        <MenuItem name="Default recipients" />
                    </MenuSection>

                    <MenuSection name="Advanced">
                        <MenuItem name="Integrations" />
                        <MenuItem name="Code injection" />
                        <MenuItem name="Labs" />
                        <MenuItem name="History" />
                    </MenuSection>
                </div>
            </div>
            <div className="pt-[3vmin] flex-auto md:pt-[72px]">
                
                <SettingSection name="General">
                    <SettingGroup name="Title and description" />
                    <SettingGroup name="Timezone" />
                    <SettingGroup name="Publication language" />
                    <SettingGroup name="Meta data" />
                    <SettingGroup name="Twitter card" />
                    <SettingGroup name="Facebook card" />
                    <SettingGroup name="Social accounts" />
                    <SettingGroup name="Make this site private" />
                    <SettingGroup name="Users and permissions" />
                </SettingSection>

                <SettingSection name="Site">
                    <SettingGroup name="Branding and design" />
                    <SettingGroup name="Navigation" />
                </SettingSection>

                <SettingSection name="Membership">
                    <SettingGroup name="Portal" />
                    <SettingGroup name="Access" />
                    <SettingGroup name="Tiers" />
                    <SettingGroup name="Analytics" />
                </SettingSection>

                <SettingSection name="Email newsletters">
                    <SettingGroup name="Newsletter sending" />
                    <SettingGroup name="Newsletters" />
                    <SettingGroup name="Default recipients" />
                </SettingSection>

                <SettingSection name="Advanced">
                    <SettingGroup name="Integrations" />
                    <SettingGroup name="Code injection" />
                    <SettingGroup name="Labs" />
                    <SettingGroup name="History" />
                </SettingSection>
            </div>
        </div>
    </div>
    );
}

export default App;
