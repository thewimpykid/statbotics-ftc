export default function Matches({ matches }: { matches: any }) {
    if (!matches || matches.length === 0) {
      return <p>No matches available.</p>;
    }
  
    return (
      <div className="text-white">
        {matches.map((match: any) => (
          <div key={match.matchNumber} className="border-b py-4">
            <h3 className="text-lg font-bold">Match {match.matchNumber}: {match.description}</h3>
            <p><strong>Tournament Level:</strong> {match.tournamentLevel}</p>
            <p><strong>Start Time:</strong> {new Date(match.actualStartTime).toLocaleString()}</p>
  
            <div className="mt-2">
              <h4 className="font-semibold">Red Team:</h4>
              {match.teams.filter((team: any) => team.station.includes('Red')).map((team: any) => (
                <p key={team.teamNumber}>Team {team.teamNumber} (Station: {team.station})</p>
              ))}
              <p><strong>Red Score:</strong> {match.scoreRedFinal} (Auto: {match.scoreRedAuto}, Foul: {match.scoreRedFoul})</p>
            </div>
  
            <div className="mt-2">
              <h4 className="font-semibold">Blue Team:</h4>
              {match.teams.filter((team: any) => team.station.includes('Blue')).map((team: any) => (
                <p key={team.teamNumber}>Team {team.teamNumber} (Station: {team.station})</p>
              ))}
              <p><strong>Blue Score:</strong> {match.scoreBlueFinal} (Auto: {match.scoreBlueAuto}, Foul: {match.scoreBlueFoul})</p>
            </div>
  
            <p><strong>Post Result Time:</strong> {new Date(match.postResultTime).toLocaleString()}</p>
          </div>
        ))}
      </div>
    );
  }
  