package com.oj.friend.entity.exam.vo;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

@Data
public class ExamRankVo {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;

    private String nickName;

    private int examRank;

    private int score;

}
