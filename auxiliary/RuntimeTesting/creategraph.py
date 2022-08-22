import matplotlib.pyplot as plt
import numpy as np


def extractAndGraph(fileName, ax, col, polyNum):
    xVals = []
    yVals = []

    with open(fileName) as f:
        for line in f.readlines():
            cX, cY = (float(i) for i in line.strip().split(","))
            xVals.append(cX)
            yVals.append(cY / cX)

    ax.scatter(xVals, yVals, color=col)
    if(polyNum == 1):
        a, b = np.polyfit(1 / np.array(xVals), np.array(yVals), 1)
        return ax.plot(np.array(xVals), a * 1 / np.array(xVals) + b, color=col)[0]
    if(polyNum == 2):
        a, b, c = np.polyfit(np.array(xVals), np.array(yVals), 2)
        return ax.plot(np.array(xVals), a * np.array(xVals)
                       * np.array(xVals) + b * np.array(xVals) + c, color=col)[0]


fig = plt.figure(figsize=(6, 8))
ax2 = fig.add_axes([0.15, 0.1, 0.7, 0.35])
ax1 = fig.add_axes([0.15, 0.6, 0.7, 0.35])
ax1.set_xlabel("Number of Nodes")
ax1.set_ylabel("Execution Time(ms) / Number of Nodes")
ax1.set_title("Run Time Per Node")
fileStems = ["await-bash", "then-bash", "await-fl", "then-fl"]
lines = [extractAndGraph(f"{fileStems[0]}-rt.csv", ax1, "red", 1),
         extractAndGraph(f"{fileStems[1]}-rt.csv", ax1, "blue", 1),
         extractAndGraph(f"{fileStems[2]}-rt.csv", ax1, "green", 2),
         extractAndGraph(f"{fileStems[3]}-rt.csv", ax1, "purple", 2)]
ax1.legend(lines, fileStems)

ax2.set_xlabel('Number of Nodes')
ax2.set_ylabel('Memory Usage (MB) / Number of Nodes')
ax2.set_title("Memory Per Node")
lines2 = [extractAndGraph(f"{fileStems[0]}-mem.csv", ax2, "red", 1),
          extractAndGraph(f"{fileStems[1]}-mem.csv", ax2, "blue", 1),
          extractAndGraph(f"{fileStems[2]}-mem.csv", ax2, "green", 1),
          extractAndGraph(f"{fileStems[3]}-mem.csv", ax2, "purple", 1)]
ax2.legend(lines2, fileStems)
plt.show()
