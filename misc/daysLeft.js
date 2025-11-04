function daysLeftToEvent(eventDate) {
  var now = new Date();
  var diff = eventDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function nextEventDate(month, day) {
  var now = new Date();
  var y = now.getFullYear();
  var date = new Date(y, month - 1, day);
  if (date < now) date.setFullYear(y + 1);
  return date;
}

var events = [
  { name: "New Year", date: nextEventDate(1, 1) },
  { name: "Valentine's Day", date: nextEventDate(2, 14) },
  { name: "April Fools' Day", date: nextEventDate(4, 1) },
  { name: "Easter", date: nextEventDate(4, 20) }, // approximate static Easter
  { name: "Summer Solstice", date: nextEventDate(6, 21) },
  { name: "Independence Day (US)", date: nextEventDate(7, 4) },
  { name: "Halloween", date: nextEventDate(10, 31) },
  { name: "Thanksgiving (US)", date: nextEventDate(11, 28) }, // roughly 4th Thursday
  { name: "Christmas", date: nextEventDate(12, 25) },
];

events.sort(function(a, b) {
  return daysLeftToEvent(a.date) - daysLeftToEvent(b.date);
});

for (var i = 0; i < events.length; i++) {
  var e = events[i];
  var left = daysLeftToEvent(e.date);
  console.log(e.name + ": " + left + " day(s) left");
}