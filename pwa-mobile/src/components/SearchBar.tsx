import search from '../assets/icons/search.svg';

export default () => {
    return (<>
        <div style={{filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.25))', borderRadius: '25px', height: '35px'}}>
            <input type="text" placeholder="e.g. happy" style={{borderRadius: '25px', padding: '7px 40px', backgroundImage: `url(${search})`, backgroundRepeat: 'no-repeat', backgroundAttachment: 'scroll', backgroundPosition: '10px 8px'}} />
        </div>
    </>);
};
