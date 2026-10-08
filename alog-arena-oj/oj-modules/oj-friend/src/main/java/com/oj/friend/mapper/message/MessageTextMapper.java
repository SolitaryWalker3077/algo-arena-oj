package com.oj.friend.mapper.message;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.friend.entity.message.MessageText;
import com.oj.friend.entity.message.vo.MessageTextVo;

import java.util.List;

public interface MessageTextMapper extends BaseMapper<MessageText> {

    List<MessageTextVo> selectUserMsgList(Long userId);
}
