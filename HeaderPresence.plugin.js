/**
 * @name HeaderPresence
 * @author KingGamingYT
 * @description See a user's current activities from the header of their user profile, just as it used to be.
 * @version 1.0.1
 */ 

const { Data, Webpack, React, Patcher, DOM, UI } = BdApi;
const ActivityStore = Webpack.getStore("PresenceStore");
const UserStore = Webpack.getStore("UserStore");
const ChannelStore = Webpack.getStore("ChannelStore");
const StreamStore = Webpack.getStore('ApplicationStreamingStore');
const { useStateFromStores } = Webpack.getMangled(m => m.Store, {
        useStateFromStores: Webpack.Filters.byStrings("useStateFromStores")
        }, { raw: true });
const profileModal = Webpack.getMangled("FULL_SIZE", {user: x=>x.toString?.().includes('==')})
const profileModalTwo = Webpack.getByStrings('hidePersonalInformation','PRESS_SECTION', {defaultExport: false});
const ActivityCard = Webpack.getByStrings("USER_PROFILE_LIVE_ACTIVITY_CARD", "UserProfileActivityCard");
const SpotifyCard = Webpack.getByStrings("USER_PROFILE_LIVE_ACTIVITY_CARD", "HOVER_ACTIVITY_CARD");
const VoiceCard = Webpack.getByStrings("USER_PROFILE_VOICE_ACTIVITY_CARD", "OPEN_VOICE_GUILD");
const StreamCard = Webpack.getByStrings("stream", "OPEN_VOICE_GUILD");
const { Button, closeModal } = Webpack.getMangled(/ConfirmModal:\(\)=>.{1,3}.ConfirmModal/, 
    { Button: x=>x.toString?.().includes('submittingFinishedLabel'), 
    closeModal: Webpack.Filters.byStrings(".setState", ".getState()[")});
const FormSwitch = Webpack.getByStrings('ERROR','tooltipNote', { searchExports: true });

const hideActivityPatch = (that, [props]) => {
    if (!props?.items) return;

    return props.items = props.items?.filter(item => item.section !== "ACTIVITY");
}

const settings = {
	hideActivity: {
		name: "Hide activity tab",
		note: "Hide the activity tab on profiles. Enabled by default.",
        default: true,
        changed: (v) => {
            if (v)
                Patcher.before("hideActivity", profileModal2, "Z", hideActivityPatch);
            else
                Patcher.unpatchAll('hideActivity');
        }
	}
};
const changelog = {
    changelog: [
        {
            "title": "Changes",
            "type" : "improved",
            "items": [
                "Plugin release!"
            ]
        }
    ]
};

const styles = Object.assign({}, Webpack.getByKeys("overlay", "inner"));

const statusCSS = webpackify(
    `
    .hp-activityContainer {
        border-radius: var(--radius-sm);
        background: var(--bg-mod-faint);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        flex: 1 0 100px;
        scroll-snap-type: y mandatory;
        & .overlay {
                scroll-snap-align: start;
                scroll-margin-top: 15px;
            }
	    &::-webkit-scrollbar {
		    width: 6px;
            border: unset;
            background: transparent;
	    }
	    &:hover::-webkit-scrollbar-track {
		    background: 0 0;
		    border-radius: 10px;
	    }
	    &:hover::-webkit-scrollbar-thumb {
		    background: var(--bg-overlay-6, var(--background-tertiary));
		    border-radius: 999px;
	    }
    }
    
    .hp-activityContainer:empty { display:none }

    .custom-profile-theme {
        .hp-activityContainer {
            background: rgb(var(--bg-overlay-color) / var(--bg-overlay-opacity-5));
        }
    }
    `
)

function webpackify(css) {
    for (const key in styles) {
        let regex = new RegExp(`\\.${key}([\\s,.):>])`, 'g');
        css = css.replace(regex, `.${styles[key]}$1`);
    }
    return css;
}
 
module.exports = class HeaderPresence {
    constructor(meta) {
        this.meta = meta;

        const pastVersion = Data.load('HeaderPresence', "version");
        this.shouldDisplayChangelog = typeof pastVersion === "string" ? pastVersion !== this.meta.version : true;
        Data.save('HeaderPresence', "version", this.meta.version);
    }
    start() {     
        if (this.shouldDisplayChangelog) {
            const SCM = UI.showChangelogModal({
                title: this.meta.name + " Changelog",
                subtitle: this.meta.version,
                changes: changelog.changelog,
                footer: React.createElement(Button, {
                    onClick: () => {
                        closeModal(SCM);
                    },
                    children: "Okay",
                    style: { marginLeft: "auto" }
                })
            });
        }

        for (let key in settings) {
            if (Data.load('HeaderPresence', key) === undefined)
                Data.save('HeaderPresence', key, settings[key].default);
        }
        if (Data.load('HeaderPresence', 'hideActivity')) {
            Patcher.before("hideActivity", profileModalTwo, "Z", hideActivityPatch);
        }

            DOM.addStyle('statusCSS', statusCSS);
            Patcher.after("HeaderPresence", profileModal, "user", (that, [props], res) => {
                const activities = useStateFromStores([ ActivityStore ], () => ActivityStore.getActivities(props.user.id));
                const voice = useStateFromStores([ Webpack.getStore('VoiceStateStore') ], () => Webpack.getStore('VoiceStateStore').getVoiceStateForUser(props.user.id)?.channelId);

                if (!props.profileType?.includes("FULL_SIZE")) return;
                return [
                    res,
                (!activities.length == 0 || voice != undefined) && React.createElement("div", {
                        className: "hp-activityContainer",
                        style: {overflow: "hidden auto"},
                        children: [
                            voice != undefined && useStateFromStores([ StreamStore ], () => StreamStore.getAllApplicationStreamsForChannel(voice).map((streams) => streams.ownerId == props.user.id && React.createElement(StreamCard, {user: props.user, stream: streams, currentUser: useStateFromStores([ UserStore ], () => UserStore.getCurrentUser())}))),
                            voice != undefined && useStateFromStores([ StreamStore ], () => StreamStore.getAnyStreamForUser(props.user.id) == null) && React.createElement(VoiceCard, {user: props.user, voiceChannel: useStateFromStores([ ChannelStore ], () => ChannelStore.getChannel(voice)), currentUser: useStateFromStores([ UserStore ], () => UserStore.getCurrentUser())}),
                            activities.map((activity) => activity?.type != 4 && !activity.name.includes("Spotify") && React.createElement(ActivityCard, {user: props.user, currentUser: useStateFromStores([ UserStore ], () => UserStore.getCurrentUser()), activity: activity})),
                            activities.map((activity) => activity?.type != 4 && !props.user.bot == true && React.createElement(SpotifyCard, {user: props.user, currentUser: useStateFromStores([ UserStore ], () => UserStore.getCurrentUser()), activity: activity})),
                        ]
                    })
                ]
            });
    }

    getSettingsPanel() {
        return React.createElement(() => Object.keys(settings).map((key) => {
	        const [state, setState] = React.useState(Data.load('HeaderPresence', key));
	        const { name, note, changed } = settings[key];

            return React.createElement(FormSwitch, {
	        	children: name,
	        	note: note,
	        	value: state,
	        	onChange: (v) => {
	        		Data.save('HeaderPresence', key, v);
	        		setState(v);
                    if (changed)
                        changed(v);
	        	}
	        });
        }));
	}

    stop() {
        Patcher.unpatchAll("HeaderPresence");
        Patcher.unpatchAll("hideActivity");
        DOM.removeStyle('statusCSS', statusCSS);
    }
}