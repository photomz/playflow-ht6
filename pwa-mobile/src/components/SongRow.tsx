const PlayUnit = ({ title, playlist, name }: { title: string, playlist: string, name: string }) => {
    return <>
        <div className="flex font-bold" style={{marginBottom: '8px'}}>
            <div className="rounded-lg" style={{width: '50px', height: '50px', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)'}}></div>
            <div className="flex flex-col" style={{padding: '8px 13px 7px'}}>
                <span style={{lineHeight: '20px'}}>{title}</span>
                <span style={{lineHeight: '15px', fontSize: '12px'}}>{playlist} · {name}</span>
            </div>
       </div>
    </>;
};
export default PlayUnit;
