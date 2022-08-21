const PlayUnit = ({ title, name }: { title: string, name: string }) => {
    return <>
        <div className="flex font-bold" style={{marginBottom: '14px'}}>
            <div className="rounded-lg" style={{width: '60px', height: '60px', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)'}}></div>
            <div className="flex flex-col" style={{padding: '10px 15px 15px'}}>
                <span style={{lineHeight: '20px', marginBottom: '5px'}}>{title}</span>
                <span style={{lineHeight: '15px', fontSize: '12px'}}>{name}</span>
            </div>
        </div>
    </>;
};
export default PlayUnit;
