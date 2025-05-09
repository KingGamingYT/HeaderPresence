/**
 * @name HeaderPresence
 * @author KingGamingYT
 * @description See a user's current activities from the header of their user profile, just as it used to be.
 * @version 1.2.2
 */ 

const { Data, Webpack, React, Patcher, DOM, UI } = BdApi;
const ActivityStore = Webpack.getStore("PresenceStore");
const UserStore = Webpack.getStore("UserStore");
const ChannelStore = Webpack.getStore("ChannelStore");
const StreamStore = Webpack.getStore('ApplicationStreamingStore');
const { useStateFromStores } = Webpack.getMangled(m => m.Store, {
        useStateFromStores: Webpack.Filters.byStrings("useStateFromStores")
        }, { raw: true });
const profileModal = Webpack.getMangled("clickableUsername", {user: x=>x.toString?.().includes('==')});
const profileModalTwo = Webpack.waitForModule(Webpack.Filters.byStrings('hidePersonalInformation','PRESS_SECTION'), {defaultExport: false});
const ActivityCard = Webpack.getByStrings("USER_PROFILE_LIVE_ACTIVITY_CARD", "UserProfileActivityCard");
const SpotifyCard = Webpack.getByStrings("USER_PROFILE_LIVE_ACTIVITY_CARD", "HOVER_ACTIVITY_CARD");
const VoiceCard = Webpack.getByStrings("USER_PROFILE_VOICE_ACTIVITY_CARD");
const StreamCard = Webpack.getByStrings("stream", "UserProfileFeaturedActivity");
const EmojiRenderer = Webpack.getByStrings('translateSurrogatesToInlineEmoji');
const { Button, closeModal } = Webpack.getMangled(/ConfirmModal:\(\)=>.{1,3}.ConfirmModal/, 
    { Button: x=>x.toString?.().includes('submittingFinishedLabel'), 
    closeModal: Webpack.Filters.byStrings(".setState", ".getState()[")});
const FormSwitch = Webpack.getByStrings('ERROR','tooltipNote', { searchExports: true });

function CustomCards({props, activities}) {
    const _activities = activities.filter(activity => activity && activity.type === 4);
    const _emoji = activities.filter(activity => activity.emoji);

    return _activities.map(activity => React.createElement("div", {
        className: "hp-customStatusContainer",
        children: [
            React.createElement("div", { className: "hp-customStatusHeader" }, activity.name),
            React.createElement("div", { 
                className: "hp-customStatusContent",
                children: [
                    _emoji.map(emoji => React.createElement(EmojiRenderer, { emoji: activity.emoji })),
                    React.createElement("div", { className: "hp-customStatusText" }, activity.state),
                ]
            })
        ]
    }))
}
function ActivityCards({props, activities}) {
    const _activities = activities.filter(activity => activity && activity.type !== 4 && activity.name && !activity.name.includes("Spotify"));
    return _activities.map(activity => React.createElement(ActivityCard, {key: "ac" + activity.created_at, user: props.user, currentUser: UserStore.getCurrentUser(), activity: activity}));
}
function SpotifyCards({props, activities}) {
    const _activities = activities.filter(activity => activity && activity?.type !== 4 && !props.user.bot === true);
    return _activities.map(activity => React.createElement(SpotifyCard, {key: "sc" + activity.created_at, user: props.user, currentUser: UserStore.getCurrentUser(), activity: activity}));
}
function VoiceCards({props, voice}) {
    const stream = useStateFromStores([ StreamStore ], () => StreamStore.getAnyStreamForUser(props.user.id));
    const channel = useStateFromStores([ ChannelStore ], () => ChannelStore.getChannel(voice));
  
    if (stream || !channel) return;
    return React.createElement(VoiceCard, {user: props.user, voiceChannel: channel, currentUser: UserStore.getCurrentUser()});
}
function StreamCards({props, voice}) {
    const streams = useStateFromStores([ StreamStore ], () => StreamStore.getAllApplicationStreamsForChannel(voice));
    const _streams = streams.filter(streams => streams && streams.ownerId == props.user.id);
    return _streams.map(streams => React.createElement(StreamCard, {user: props.user, stream: streams, currentUser: UserStore.getCurrentUser()}))
}

const hideActivityPatch = (that, [props]) => {
    if (Data.load('HeaderPresence', 'hideActivity')) {
        if (!props?.items) return;

        return props.items = props.items?.filter(item => item.section !== "ACTIVITY");
    }
}

const restoreCustomPatch = (that, [props], res) => {
    const activities = useStateFromStores([ ActivityStore ], () => ActivityStore.getActivities(props.user.id));
    
    if (Data.load('HeaderPresence', 'restoreCustom')) {
        if (!props.tags.props.themeType?.includes("MODAL")) return;

        if (Array.isArray(res.props?.children)) {
            if (activities.length !== 0) {
                res.props.children.push(
                    React.createElement(CustomCards, {props, activities})
                )
            }
        };
    }
}

const settings = {
	hideActivity: {
		name: "Hide activity tab",
		note: "Hide the activity tab on profiles. Enabled by default.",
        default: true,
        changed: (v) => {
            if (v)
                Patcher.before("hideActivity", profileModalTwo, "Z", hideActivityPatch);
            else
                Patcher.unpatchAll('hideActivity');
        }
	},
    restoreCustom: {
        name: "Restore custom status formatting",
        note: "Turns custom statuses back into a section of the profile header info.",
        default: false,
        changed: (v) => {
            if (v)
                Patcher.after("restoreCustom", profileModal, "user", restoreCustomPatch);
            else
                Patcher.unpatchAll('restoreCustom');
        }
    }
};
const changelog = {
    changelog: [
        {
            "title": "Changes",
            "type" : "improved",
            "items": [
                "Fixed broken patches"
            ]
        }
    ]
};

const styles = Object.assign({}, 
    Webpack.getByKeys("overlay", "inner"), 
    Webpack.getByKeys("inner", "container"));

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
        .hp-activityContainer, .customStatusContainer {
            background: rgb(var(--bg-overlay-color) / var(--bg-overlay-opacity-5));
        }
    }

    .user-profile-modal:has(.hp-customStatusContainer) .container { 
        display: none;
    }
    .hp-customStatusContainer {
        padding: 20px 20px 20px 25px;
        margin-top: 30px;
        border-radius: var(--radius-sm);
        background: var(--bg-mod-faint);
    }
    .hp-customStatusHeader {
        font-family: var(--font-display);
        font-size: 12px;
        line-height: 1.2857142857142858;
        font-weight: 600;
        color: var(--header-secondary);
        margin-bottom: 8px;
    }
    .hp-customStatusContent {
        .emoji {
            margin-right: 8px;
            height: 20px;
            width: 20px;
        }
        .emoji+.hp-customStatusText {
            display: inline;
        }
        &:has(.hp-customStatusText:empty) .emoji {
            height: 48px;
            width: 48px;
        }
    }
    .hp-customStatusText {
        color: var(--header-secondary);
        font-weight: 500;
        font-size: 14px;
    }
    .user-profile-modal:has(.hp-activityContainer:not(:empty)) .hp-customStatusText { 
        font-weight: 550;
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

        DOM.addStyle('statusCSS', statusCSS);
        profileModalTwo.then(profileModalTwo => {Patcher.before("hideActivity", profileModalTwo, "Z", hideActivityPatch)});
        Patcher.after("restoreCustom", profileModal, "user", restoreCustomPatch);
        Patcher.after("HeaderPresence", profileModal, "user", (that, [props], res) => {
            const activities = useStateFromStores([ ActivityStore ], () => ActivityStore.getActivities(props.user.id));
            const voice = useStateFromStores([ Webpack.getStore('VoiceStateStore') ], () => Webpack.getStore('VoiceStateStore').getVoiceStateForUser(props.user.id)?.channelId);

            if (!props.tags.props.themeType?.includes("MODAL")) return;
            return [
                res,
            (activities.length !== 0 || voice !== undefined) && React.createElement("div", {
                    className: "hp-activityContainer",
                    style: {overflow: "hidden auto"},
                    children: [
                        React.createElement(StreamCards, {props, voice}),
                        React.createElement(VoiceCards, {props, voice}),
                        React.createElement(SpotifyCards, {props, activities}),
                        React.createElement(ActivityCards, {props, activities})
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
        Patcher.unpatchAll('restoreCustom');
        DOM.removeStyle('statusCSS', statusCSS);
    }
}